"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Loader2 } from "lucide-react";

interface Product {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
}

interface EditarProductoModalProps {
  productId: number;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (error: string) => void;
}

export default function EditarProductoModal({
  productId,
  onClose,
  onSuccess,
  onError,
}: EditarProductoModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    salePrice: "",
    minStock: "",
    isActive: true,
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error("Error al cargar producto");

        const data = await response.json();
        setProduct(data);
        setFormData({
          name: data.name,
          salePrice: data.salePrice.toString(),
          minStock: data.minStock.toString(),
          isActive: data.isActive,
        });
      } catch (err: any) {
        onError(err.message || "Error al cargar producto");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, onClose, onError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    const salePrice = parseFloat(formData.salePrice);
    const minStock = parseInt(formData.minStock);

    if (isNaN(salePrice) || salePrice <= 0) {
      onError("El precio debe ser mayor a 0");
      return;
    }

    if (isNaN(minStock) || minStock < 0) {
      onError("El stock mínimo no puede ser negativo");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          salePrice,
          minStock,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar producto");
      }

      onSuccess(`Producto actualizado: ${formData.name}`);
    } catch (err: any) {
      onError(err.message || "Error al actualizar producto");
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

  const isMembership =
    product.name.includes("EFECTIVO") ||
    product.name === "VISITA" ||
    product.name.includes("MENSUALIDAD") ||
    product.name.includes("SEMANA");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-white rounded-t-xl shrink-0">
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
          {!isMembership && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600">Stock Bodega:</span>
                  <span className="ml-2 font-medium">
                    {product.warehouseStock}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Stock Gym:</span>
                  <span className="ml-2 font-medium">{product.gymStock}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={submitting}
                required
              />
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Precio de Venta *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.salePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, salePrice: e.target.value })
                  }
                  disabled={submitting}
                  required
                />
              </div>

              {!isMembership && (
                <div className="space-y-2">
                  <Label>Stock Mínimo *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                    disabled={submitting}
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Estado</Label>
                <p className="text-xs text-gray-500">
                  {formData.isActive ? "Activo" : "Inactivo"}
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
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
