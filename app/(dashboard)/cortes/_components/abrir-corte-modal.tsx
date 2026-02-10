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
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OpenShiftInput) => Promise<void>;
  error?: string;
}

export default function AbrirCorteModal({
  open,
  onClose,
  onSubmit,
  error,
}: AbrirCorteModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<OpenShiftInput>({
    resolver: zodResolver(OpenShiftSchema),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: OpenShiftInput) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
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
              onClick={handleClose}
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
