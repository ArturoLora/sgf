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
import { Loader2 } from "lucide-react";
import {
  CreateWithdrawalSchema,
  type CreateWithdrawalInput,
} from "@/types/api/shifts";

interface RegistrarRetiroModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWithdrawalInput) => Promise<void>;
  error?: string;
}

export default function RegistrarRetiroModal({
  open,
  onClose,
  onSubmit,
  error,
}: RegistrarRetiroModalProps) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    reset,
  } = useForm<CreateWithdrawalInput>({
    resolver: zodResolver(CreateWithdrawalSchema),
    defaultValues: { amount: 0, concept: "" },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: CreateWithdrawalInput) => {
    await onSubmit(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Retiro de Efectivo</DialogTitle>
          <DialogDescription>
            El retiro queda registrado en el turno activo inmediatamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="retiro-amount">Monto *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="retiro-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                autoFocus
                {...register("amount", { valueAsNumber: true })}
                className="pl-7"
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="retiro-concept">Concepto *</Label>
            <Input
              id="retiro-concept"
              placeholder="Ej: Pago proveedor, gastos varios..."
              {...register("concept")}
            />
            {errors.concept && (
              <p className="text-xs text-destructive">
                {errors.concept.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Registrando...
                </>
              ) : (
                "Registrar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
