"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Loader2 } from "lucide-react";
import {
  UpdateProductInputSchema,
  type ActualizarProductoRequest,
  type ProductoResponse,
} from "@/types/api/products";
import { updateProduct } from "@/lib/api/products.client";
import { isMembership } from "@/lib/domain/products";

interface EditarProductoModalProps {
  product: ProductoResponse;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (error: string) => void;
}

export default function EditarProductoModal({
  product,
  onClose,
  onSuccess,
  onError,
}: EditarProductoModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ActualizarProductoRequest>({
    resolver: zodResolver(UpdateProductInputSchema),
    defaultValues: {
      name: product.name,
      salePrice: Number(product.salePrice),
      minStock: product.minStock,
      isActive: product.isActive,
    },
  });

  const isActive = watch("isActive");

  const onSubmit = async (data: ActualizarProductoRequest) => {
    setSubmitting(true);
    try {
      const result = await updateProduct(product.id, data);

      if ("error" in result) {
        const message =
          typeof result.error === "string"
            ? result.error
            : "Error al actualizar producto";
        throw new Error(message);
      }

      onSuccess(`Producto actualizado: ${data.name}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar producto";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isMembershipProduct = isMembership(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-background rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              Editar Producto
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
          {!isMembershipProduct && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground">Stock Bodega:</span>
                  <span className="ml-2 font-medium">
                    {product.warehouseStock}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Stock Gym:</span>
                  <span className="ml-2 font-medium">{product.gymStock}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input {...register("name")} disabled={submitting} />
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
                />
                {errors.salePrice && (
                  <p className="text-xs text-destructive">
                    {errors.salePrice.message}
                  </p>
                )}
              </div>

              {!isMembershipProduct && (
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
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Estado</Label>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Activo" : "Inactivo"}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(checked: boolean) =>
                  setValue("isActive", checked)
                }
                disabled={submitting}
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
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
