// app/(dashboard)/productos/_components/ajuste-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { X, Loader2, Plus, Minus } from "lucide-react";
import { CreateAdjustmentInputSchema } from "@/types/api/inventory";
import { fetchProductById } from "@/lib/api/products.client";
import {
  validateAdjustment,
  validateAdjustmentNotes,
} from "@/lib/domain/products";
import type { ProductoResponse } from "@/types/api/products";
import type { Ubicacion } from "@/types/models/movimiento-inventario";

interface AdjustmentFormData {
  productId: number;
  quantity: number;
  location: string;
  notes: string;
}

interface AjusteModalProps {
  productId: number;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (error: string) => void;
}

export default function AjusteModal({
  productId,
  onClose,
  onSuccess,
  onError,
}: AjusteModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<ProductoResponse | null>(null);
  const [type, setType] = useState<"INCREASE" | "DECREASE">("INCREASE");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(CreateAdjustmentInputSchema),
    defaultValues: { productId, location: "WAREHOUSE", quantity: 0, notes: "" },
  });

  const location = watch("location") as Ubicacion;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProductById(productId);
        setProduct(data);
      } catch (err) {
        onError(
          err instanceof Error ? err.message : "Error al cargar producto",
        );
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, onClose, onError]);

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!product) return;

    const currentStock =
      data.location === "WAREHOUSE" ? product.warehouseStock : product.gymStock;
    const numericQuantity = Number(data.quantity);

    const validation = validateAdjustment(numericQuantity, type, currentStock);
    if (!validation.valid) {
      onError(validation.error || "Validación falló");
      return;
    }

    const notesValidation = validateAdjustmentNotes(data.notes);
    if (!notesValidation.valid) {
      onError(notesValidation.error || "Notas requeridas");
      return;
    }

    const adjustedQuantity =
      type === "INCREASE" ? numericQuantity : -numericQuantity;

    setSubmitting(true);
    try {
      const response = await fetch("/api/inventory/adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, quantity: adjustedQuantity }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Error al realizar ajuste");

      const typeLabel = type === "INCREASE" ? "Incremento" : "Decremento";
      const locationName = data.location === "WAREHOUSE" ? "Bodega" : "Gym";
      onSuccess(
        `${typeLabel} de ${numericQuantity} unidades en ${locationName}`,
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al realizar ajuste");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) return null;

  const currentStock =
    location === "WAREHOUSE" ? product.warehouseStock : product.gymStock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-background rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              Ajuste de Inventario
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
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
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
                <Label>Tipo de Ajuste *</Label>
                <Select
                  value={type}
                  onValueChange={(value: "INCREASE" | "DECREASE") =>
                    setType(value)
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCREASE">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                        Incrementar
                      </div>
                    </SelectItem>
                    <SelectItem value="DECREASE">
                      <div className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-destructive" />
                        Decrementar
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                min="1"
                {...register("quantity", { valueAsNumber: true })}
                disabled={submitting}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">
                  {errors.quantity.message}
                </p>
              )}
              {type === "DECREASE" && (
                <p className="text-xs text-destructive">
                  Máximo disponible: {currentStock}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notas *</Label>
              <Input
                {...register("notes")}
                disabled={submitting}
                placeholder="Motivo del ajuste"
              />
              {errors.notes && (
                <p className="text-xs text-destructive">
                  {errors.notes.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Describe el motivo del ajuste (requerido)
              </p>
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
                  "Realizar Ajuste"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
