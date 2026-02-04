"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";
import {
  CreateProductInputSchema,
  type CreateProductInputRaw,
} from "@/types/api/products";

interface CrearProductoModalProps {
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (error: string) => void;
}

export default function CrearProductoModal({
  onClose,
  onSuccess,
  onError,
}: CrearProductoModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProductInputRaw>({
    resolver: zodResolver(CreateProductInputSchema),
    defaultValues: {
      name: "",
      salePrice: 0,
      minStock: 5,
    },
  });

  const onSubmit = async (data: CreateProductInputRaw) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear producto");
      }

      onSuccess(`Producto creado: ${data.name}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al crear producto";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-background rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              Nuevo Producto
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                {...register("name")}
                disabled={submitting}
                placeholder="Ej: Proteína Whey 2kg"
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Precio de Venta *</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("salePrice", { valueAsNumber: true })}
                  disabled={submitting}
                  placeholder="0.00"
                />
                {errors.salePrice && (
                  <p className="text-xs text-destructive">
                    {errors.salePrice.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Stock Mínimo *</Label>
                <Input
                  type="number"
                  {...register("minStock", { valueAsNumber: true })}
                  disabled={submitting}
                />
                {errors.minStock && (
                  <p className="text-xs text-destructive">
                    {errors.minStock.message}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                💡 El producto se creará con 0 unidades en stock. Usa
                &quot;Entrada de Stock&quot; después de crearlo para agregar
                inventario.
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
                    Creando...
                  </>
                ) : (
                  "Crear Producto"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
