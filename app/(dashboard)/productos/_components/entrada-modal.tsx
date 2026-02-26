"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";
import { CreateEntryInputSchema } from "@/types/api/inventory";
import type { ProductoResponse } from "@/types/api/products";
import { getStockByLocation, locationLabel } from "@/lib/domain/products";

type EntryFormValues = z.infer<typeof CreateEntryInputSchema>;

interface EntradaModalProps {
  product: ProductoResponse;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (error: string) => void;
}

export default function EntradaModal({
  product,
  onClose,
  onSuccess,
  onError,
}: EntradaModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EntryFormValues>({
    resolver: zodResolver(CreateEntryInputSchema),
    defaultValues: {
      productId: product.id,
      location: "WAREHOUSE",
      quantity: 0,
      notes: "",
    },
  });

  const location = watch("location");

  const onSubmit = async (data: EntryFormValues) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/inventory/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al registrar entrada");
      }

      onSuccess(
        `Entrada registrada: ${data.quantity} unidades en ${locationLabel(data.location)}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al registrar entrada";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentStock = getStockByLocation(product, location);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-background rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              Entrada de Stock
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-6 overflow-y-auto">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-semibold text-sm sm:text-base">{product.name}</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs sm:text-sm">
              <div>
                <span className="text-muted-foreground">Bodega:</span>
                <span className="ml-2 font-medium">
                  {product.warehouseStock}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Gym:</span>
                <span className="ml-2 font-medium">{product.gymStock}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Ubicación *</Label>
              <Select
                value={location}
                onValueChange={(value: string) => setValue("location", value)}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAREHOUSE">Bodega</SelectItem>
                  <SelectItem value="GYM">Gym</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Stock actual: {currentStock}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                {...register("quantity", { valueAsNumber: true })}
                disabled={submitting}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                {...register("notes")}
                disabled={submitting}
                placeholder="Opcional"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Registrar Entrada"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
