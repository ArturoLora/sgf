"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { CloseShiftSchema, type CloseShiftInput } from "@/types/api/shifts";
import type { ResumenCorteResponse, CorteResponse } from "@/types/api/shifts";

interface CerrarCorteModalProps {
  corte: CorteResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CerrarCorteModal({
  corte,
  onClose,
  onSuccess,
}: CerrarCorteModalProps) {
  const [resumen, setResumen] = useState<ResumenCorteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<CloseShiftInput>({
    resolver: zodResolver(CloseShiftSchema),
    defaultValues: {
      shiftId: corte.id,
      cashAmount: 0,
      debitCardAmount: 0,
      creditCardAmount: 0,
      totalWithdrawals: 0,
      withdrawalsConcept: "",
      notes: "",
      difference: 0,
    },
  });

  const watchedValues = watch();

  const calcularDiferencia = useCallback(() => {
    if (!resumen) return 0;

    const efectivo = Number(watchedValues.cashAmount) || 0;
    const debito = Number(watchedValues.debitCardAmount) || 0;
    const credito = Number(watchedValues.creditCardAmount) || 0;
    const retiros = Number(watchedValues.totalWithdrawals) || 0;

    const totalReal = efectivo + debito + credito - retiros;
    const totalEsperado =
      Number(resumen.initialCash) +
      Number(resumen.totalSales) -
      Number(resumen.totalWithdrawals || 0);

    return Number((totalReal - totalEsperado).toFixed(2));
  }, [
    resumen,
    watchedValues.cashAmount,
    watchedValues.debitCardAmount,
    watchedValues.creditCardAmount,
    watchedValues.totalWithdrawals,
  ]);

  const cargarResumen = useCallback(async () => {
    try {
      const res = await fetch(`/api/shifts/${corte.id}/summary`);
      if (!res.ok) throw new Error("Error al cargar resumen");

      const data = await res.json();
      setResumen(data);

      setValue("debitCardAmount", Number(data.debitCardAmount) || 0);
      setValue("creditCardAmount", Number(data.creditCardAmount) || 0);
      setValue("totalWithdrawals", Number(data.totalWithdrawals) || 0);

      const efectivoEsperado =
        Number(data.initialCash) +
        Number(data.cashAmount) -
        Number(data.totalWithdrawals || 0);
      setValue("cashAmount", Number(efectivoEsperado.toFixed(2)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [corte.id, setValue]);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  useEffect(() => {
    if (resumen) {
      const diferencia = calcularDiferencia();
      setValue("difference", diferencia);
    }
  }, [resumen, calcularDiferencia, setValue]);

  const onSubmit = async (data: CloseShiftInput) => {
    try {
      const validated = CloseShiftSchema.parse(data);

      const res = await fetch("/api/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al cerrar corte");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle className="sr-only">Cargando...</DialogTitle>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {resumen && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 border">
              <h3 className="font-semibold text-sm">Resumen del Turno</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Fondo Inicial</p>
                  <p className="font-medium">
                    ${Number(resumen.initialCash).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tickets</p>
                  <p className="font-medium">{resumen.ticketCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ventas Totales</p>
                  <p className="font-medium">
                    ${Number(resumen.totalSales).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Efectivo Esperado</p>
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

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Arqueo de Caja</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cashAmount">Efectivo en Caja *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="cashAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("cashAmount", { valueAsNumber: true })}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="debitCardAmount">Tarjeta Débito</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="debitCardAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("debitCardAmount", { valueAsNumber: true })}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditCardAmount">Tarjeta Crédito</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="creditCardAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("creditCardAmount", { valueAsNumber: true })}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalWithdrawals">Retiros</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="totalWithdrawals"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("totalWithdrawals", { valueAsNumber: true })}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {Number(watchedValues.totalWithdrawals) > 0 && (
              <div className="space-y-2">
                <Label htmlFor="withdrawalsConcept">Concepto de Retiros</Label>
                <Input
                  id="withdrawalsConcept"
                  placeholder="Ej: Pago de proveedores, gastos varios..."
                  {...register("withdrawalsConcept")}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observaciones del cierre..."
                {...register("notes")}
                rows={2}
              />
            </div>
          </div>

          {tieneDiferencia && (
            <div
              className={`rounded-lg p-4 border ${
                diferencia > 0
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle
                  className={`h-5 w-5 ${
                    diferencia > 0
                      ? "text-green-600 dark:text-green-500"
                      : "text-red-600 dark:text-red-500"
                  }`}
                />
                <div>
                  <p className="font-medium">
                    {diferencia > 0 ? "Sobrante" : "Faltante"}: $
                    {Math.abs(diferencia).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
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
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 gap-2"
              variant={tieneDiferencia ? "destructive" : "default"}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {tieneDiferencia ? "Cerrar con Diferencia" : "Cerrar Corte"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
