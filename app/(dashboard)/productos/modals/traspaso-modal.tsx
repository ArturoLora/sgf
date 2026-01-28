"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

interface Product {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
}

interface TraspasoModalProps {
  productId: number;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (error: string) => void;
}

export default function TraspasoModal({
  productId,
  onClose,
  onSuccess,
  onError,
}: TraspasoModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    from: "WAREHOUSE" as "WAREHOUSE" | "GYM",
    to: "GYM" as "WAREHOUSE" | "GYM",
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error("Error al cargar producto");
        const data = await response.json();
        setProduct(data);
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

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      onError("La cantidad debe ser mayor a 0");
      return;
    }

    const availableStock =
      formData.from === "WAREHOUSE" ? product.warehouseStock : product.gymStock;

    if (quantity > availableStock) {
      onError(`Stock insuficiente. Disponible: ${availableStock}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          from: formData.from,
          to: formData.to,
          quantity,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al realizar traspaso");
      }

      onSuccess(`Traspaso realizado: ${quantity} unidades de ${product.name}`);
    } catch (err: any) {
      onError(err.message || "Error al realizar traspaso");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFromChange = (value: "WAREHOUSE" | "GYM") => {
    setFormData({
      ...formData,
      from: value,
      to: value === "WAREHOUSE" ? "GYM" : "WAREHOUSE",
    });
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

  const availableStock =
    formData.from === "WAREHOUSE" ? product.warehouseStock : product.gymStock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-white rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              Traspaso de Stock
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
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-semibold text-sm sm:text-base">{product.name}</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs sm:text-sm">
              <div>
                <span className="text-gray-600">Bodega:</span>
                <span className="ml-2 font-medium">
                  {product.warehouseStock}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Gym:</span>
                <span className="ml-2 font-medium">{product.gymStock}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Select
                value={formData.from}
                onValueChange={handleFromChange}
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
              <p className="text-xs text-gray-500">
                Stock disponible: {availableStock}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Hacia</Label>
              <Input
                value={formData.to === "WAREHOUSE" ? "Bodega" : "Gym"}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                min="1"
                max={availableStock}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
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
                  "Realizar Traspaso"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
