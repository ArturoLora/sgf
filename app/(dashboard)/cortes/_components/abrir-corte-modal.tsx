"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DollarSign, Loader2 } from "lucide-react";
import { OpenShiftSchema, type OpenShiftInput } from "@/types/api/shifts";

interface AbrirCorteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AbrirCorteModal({
  onClose,
  onSuccess,
}: AbrirCorteModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<OpenShiftInput>({
    resolver: zodResolver(OpenShiftSchema),
  });

  const onSubmit = async (data: OpenShiftInput) => {
    try {
      const validated = OpenShiftSchema.parse(data);

      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al abrir corte");
      }

      onSuccess();
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Abrir Corte de Caja
          </DialogTitle>
          <DialogDescription>
            Ingresa el fondo inicial en efectivo para comenzar el turno
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fondoInicial">Fondo Inicial *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="fondoInicial"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("initialCash", { valueAsNumber: true })}
                className="pl-7"
                autoFocus
              />
            </div>
            {errors.initialCash && (
              <p className="text-sm text-destructive">
                {errors.initialCash.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Monto en efectivo con el que inicias el turno
            </p>
          </div>

          <div className="flex gap-2 pt-4">
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
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Abrir Corte
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
