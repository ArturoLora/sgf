"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CerrarCorteModalProps {
  corte: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CerrarCorteModal({
  corte,
  onClose,
  onSuccess,
}: CerrarCorteModalProps) {
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Campos del formulario
  const [efectivoReal, setEfectivoReal] = useState("");
  const [tarjetaDebito, setTarjetaDebito] = useState("");
  const [tarjetaCredito, setTarjetaCredito] = useState("");
  const [retiros, setRetiros] = useState("");
  const [conceptoRetiros, setConceptoRetiros] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    cargarResumen();
  }, []);

  const cargarResumen = async () => {
    try {
      const res = await fetch(`/api/shifts/${corte.id}/summary`);
      if (!res.ok) throw new Error("Error al cargar resumen");

      const data = await res.json();
      setResumen(data);

      // Pre-llenar con valores esperados
      setTarjetaDebito(data.debitCardAmount || "0");
      setTarjetaCredito(data.creditCardAmount || "0");
      setRetiros(data.totalWithdrawals || "0");

      // Calcular efectivo esperado
      const efectivoEsperado =
        Number(data.initialCash) +
        Number(data.cashAmount) -
        Number(data.totalWithdrawals || 0);
      setEfectivoReal(efectivoEsperado.toFixed(2));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calcularDiferencia = () => {
    if (!resumen) return 0;

    const efectivo = parseFloat(efectivoReal) || 0;
    const debito = parseFloat(tarjetaDebito) || 0;
    const credito = parseFloat(tarjetaCredito) || 0;
    const retirosValue = parseFloat(retiros) || 0;

    const totalReal = efectivo + debito + credito - retirosValue;
    const totalEsperado =
      Number(resumen.initialCash) +
      Number(resumen.totalSales) -
      Number(resumen.totalWithdrawals || 0);

    return totalReal - totalEsperado;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const diferencia = calcularDiferencia();

    setSubmitting(true);

    try {
      const res = await fetch("/api/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: corte.id,
          cashAmount: parseFloat(efectivoReal),
          debitCardAmount: parseFloat(tarjetaDebito),
          creditCardAmount: parseFloat(tarjetaCredito),
          totalWithdrawals: parseFloat(retiros),
          withdrawalsConcept: conceptoRetiros || undefined,
          difference: diferencia,
          notes: notas || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al cerrar corte");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const diferencia = calcularDiferencia();
  const tieneDiferencia = Math.abs(diferencia) > 0.01;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Cerrar Corte de Caja
          </DialogTitle>
          <DialogDescription>
            Folio: {corte.folio} - Realiza el arqueo de caja
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Resumen del Corte */}
          {resumen && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 border">
              <h3 className="font-semibold text-sm">Resumen del Turno</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Fondo Inicial</p>
                  <p className="font-medium">
                    ${Number(resumen.initialCash).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Tickets</p>
                  <p className="font-medium">{resumen.ticketCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Ventas Totales</p>
                  <p className="font-medium">
                    ${Number(resumen.totalSales).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Efectivo Esperado</p>
                  <p className="font-medium">
                    $
                    {(
                      Number(resumen.initialCash) + Number(resumen.cashAmount)
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Arqueo de Caja */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Arqueo de Caja</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="efectivoReal">Efectivo en Caja *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="efectivoReal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={efectivoReal}
                    onChange={(e) => setEfectivoReal(e.target.value)}
                    className="pl-7"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tarjetaDebito">Tarjeta Débito</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="tarjetaDebito"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tarjetaDebito}
                    onChange={(e) => setTarjetaDebito(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tarjetaCredito">Tarjeta Crédito</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="tarjetaCredito"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tarjetaCredito}
                    onChange={(e) => setTarjetaCredito(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retiros">Retiros</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="retiros"
                    type="number"
                    step="0.01"
                    min="0"
                    value={retiros}
                    onChange={(e) => setRetiros(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {parseFloat(retiros) > 0 && (
              <div className="space-y-2">
                <Label htmlFor="conceptoRetiros">Concepto de Retiros</Label>
                <Input
                  id="conceptoRetiros"
                  placeholder="Ej: Pago de proveedores, gastos varios..."
                  value={conceptoRetiros}
                  onChange={(e) => setConceptoRetiros(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notas">Notas (Opcional)</Label>
              <Textarea
                id="notas"
                placeholder="Observaciones del cierre..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Diferencia */}
          {tieneDiferencia && (
            <div
              className={`rounded-lg p-4 border ${
                diferencia > 0
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle
                  className={`h-5 w-5 ${
                    diferencia > 0 ? "text-green-600" : "text-red-600"
                  }`}
                />
                <div>
                  <p className="font-medium">
                    {diferencia > 0 ? "Sobrante" : "Faltante"}: $
                    {Math.abs(diferencia).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {diferencia > 0
                      ? "Hay más dinero del esperado"
                      : "Falta dinero en el arqueo"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 gap-2"
              variant={tieneDiferencia ? "destructive" : "default"}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {tieneDiferencia ? "Cerrar con Diferencia" : "Cerrar Corte"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
