"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, DollarSign, Receipt, AlertCircle } from "lucide-react";
import type { CorteResponse } from "@/types/api/shifts";

interface DetalleCorteModalProps {
  corteId: number;
  onClose: () => void;
}

export default function DetalleCorteModal({
  corteId,
  onClose,
}: DetalleCorteModalProps) {
  const [corte, setCorte] = useState<CorteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarDetalle = useCallback(async () => {
    try {
      const res = await fetch(`/api/shifts/${corteId}`);
      if (!res.ok) throw new Error("Error al cargar detalle");

      const data = await res.json();
      setCorte(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [corteId]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  const formatFecha = (fecha: string | Date) => {
    return new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="sr-only">Detalle del Corte</DialogTitle>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !corte) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Detalle del Corte</DialogTitle>
          <div className="text-center py-8">
            <p className="text-destructive">{error || "Corte no encontrado"}</p>
            <Button onClick={onClose} className="mt-4">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const estaCerrado = !!corte.closingDate;
  const diferencia = Number(corte.difference);
  const tieneDiferencia = Math.abs(diferencia) > 0.01;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
        showCloseButton={true}
      >
        <DialogTitle>Detalle del Corte</DialogTitle>

        <div className="space-y-4 sm:space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{corte.folio}</h2>
                <p className="text-sm text-muted-foreground">
                  Cajero: {corte.cashier?.name || "Sin cajero"}
                </p>
              </div>
              <div className="flex gap-2">
                {estaCerrado ? (
                  <Badge variant="secondary">Cerrado</Badge>
                ) : (
                  <Badge className="bg-blue-600 dark:bg-blue-700 text-white">
                    Abierto
                  </Badge>
                )}
                {tieneDiferencia && estaCerrado && (
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800"
                  >
                    Con diferencia
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">
                Apertura
              </p>
              <p className="text-sm">{formatFecha(corte.openingDate)}</p>
            </div>
            {estaCerrado && corte.closingDate && (
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">
                  Cierre
                </p>
                <p className="text-sm">{formatFecha(corte.closingDate)}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Resumen de Ventas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground mb-1">Tickets</p>
                <p className="text-lg font-bold">{corte.ticketCount}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground mb-1">Membresías</p>
                <p className="text-lg font-bold">
                  ${Number(corte.membershipSales).toFixed(2)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground mb-1">Productos</p>
                <p className="text-lg font-bold">
                  $
                  {(
                    Number(corte.productSales0Tax) +
                    Number(corte.productSales16Tax)
                  ).toFixed(2)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground mb-1">IVA</p>
                <p className="text-lg font-bold">
                  ${Number(corte.tax).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Formas de Pago
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-900">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">
                  Efectivo
                </p>
                <p className="text-lg font-bold">
                  ${Number(corte.cashAmount).toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">
                  T. Débito
                </p>
                <p className="text-lg font-bold">
                  ${Number(corte.debitCardAmount).toFixed(2)}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-900">
                <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">
                  T. Crédito
                </p>
                <p className="text-lg font-bold">
                  ${Number(corte.creditCardAmount).toFixed(2)}
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-900">
                <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">
                  Vouchers
                </p>
                <p className="text-lg font-bold">
                  ${Number(corte.totalVoucher).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {estaCerrado && (
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Fondo Inicial
                  </p>
                  <p className="text-xl font-bold">
                    ${Number(corte.initialCash).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Ventas
                  </p>
                  <p className="text-xl font-bold">
                    ${Number(corte.totalSales).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total en Caja
                  </p>
                  <p className="text-xl font-bold">
                    ${Number(corte.totalCash).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {estaCerrado &&
            (Number(corte.totalWithdrawals) > 0 ||
              Number(corte.cancelledSales) > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Number(corte.totalWithdrawals) > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-2">
                      Retiros
                    </p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-500">
                      ${Number(corte.totalWithdrawals).toFixed(2)}
                    </p>
                    {corte.withdrawalsConcept && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {corte.withdrawalsConcept}
                      </p>
                    )}
                  </div>
                )}
                {Number(corte.cancelledSales) > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
                    <p className="text-sm text-orange-700 dark:text-orange-400 font-medium mb-2">
                      Ventas Canceladas
                    </p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                      ${Number(corte.cancelledSales).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

          {tieneDiferencia && estaCerrado && (
            <div
              className={`rounded-lg p-4 border ${
                diferencia > 0
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`h-6 w-6 shrink-0 ${
                    diferencia > 0
                      ? "text-green-600 dark:text-green-500"
                      : "text-red-600 dark:text-red-500"
                  }`}
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg">
                    {diferencia > 0 ? "Sobrante" : "Faltante"}: $
                    {Math.abs(diferencia).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {diferencia > 0
                      ? "El arqueo reportó más dinero del esperado"
                      : "El arqueo reportó menos dinero del esperado"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {corte.notes && (
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium mb-2">Notas</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {corte.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
