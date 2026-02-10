// app/(dashboard)/productos/_components/detalle-producto-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Edit, ArrowLeftRight, Plus, Package } from "lucide-react";
import { fetchProductById } from "@/lib/api/products.client";
import type { ProductoConMovimientosResponse } from "@/types/api/products";
import {
  formatStockWarning,
  isMembershipProduct,
  getMovementTypeLabel,
  formatMovementDescription,
} from "@/lib/domain/products";

interface DetalleProductoModalProps {
  productId: number;
  onClose: () => void;
  onEdit: (id: number) => void;
  onTransfer: (id: number) => void;
  onAdjustment: (id: number) => void;
  onEntry: (id: number) => void;
}

export default function DetalleProductoModal({
  productId,
  onClose,
  onEdit,
  onTransfer,
  onAdjustment,
  onEntry,
}: DetalleProductoModalProps) {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductoConMovimientosResponse | null>(
    null,
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchProductById(productId);
        setProduct(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [productId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) return null;

  const isMembership = isMembershipProduct(product);
  const totalStock = product.warehouseStock + product.gymStock;
  const stockWarning = formatStockWarning(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-background rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              Detalle del Producto
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-6 overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg sm:text-xl font-bold">{product.name}</h3>
                {!product.isActive && (
                  <Badge variant="destructive" className="mt-1">
                    Inactivo
                  </Badge>
                )}
                {isMembership && (
                  <Badge
                    variant="outline"
                    className="mt-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    Membresía
                  </Badge>
                )}
              </div>
              <p className="text-xl sm:text-2xl font-bold">
                ${product.salePrice.toFixed(2)}
              </p>
            </div>

            {!isMembership && (
              <>
                {stockWarning && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                      {stockWarning}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Card>
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-2xl font-bold">
                        {product.gymStock}
                      </div>
                      <p className="text-xs text-muted-foreground">Stock Gym</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-2xl font-bold">
                        {product.warehouseStock}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Stock Bodega
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-2xl font-bold">{totalStock}</div>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onEdit(product.id)}
              variant="outline"
              size="sm"
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            {!isMembership && (
              <>
                <Button
                  onClick={() => onEntry(product.id)}
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <Package className="h-4 w-4" />
                  Entrada
                </Button>
                <Button
                  onClick={() => onTransfer(product.id)}
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Traspaso
                </Button>
                <Button
                  onClick={() => onAdjustment(product.id)}
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <Plus className="h-4 w-4" />
                  Ajuste
                </Button>
              </>
            )}
          </div>

          {!isMembership && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm sm:text-base">
                Historial de Movimientos
              </h4>

              {product.inventoryMovements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay movimientos registrados
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {product.inventoryMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="p-3 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <p className="font-medium text-sm">
                              {formatMovementDescription(movement)}
                            </p>
                            <p className="text-xs text-muted-foreground shrink-0">
                              {new Date(movement.date).toLocaleDateString(
                                "es-MX",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Cantidad:{" "}
                            <span className="font-medium">
                              {movement.quantity > 0 ? "+" : ""}
                              {movement.quantity}
                            </span>
                          </p>
                          {movement.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {movement.notes}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Por: {movement.user.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
