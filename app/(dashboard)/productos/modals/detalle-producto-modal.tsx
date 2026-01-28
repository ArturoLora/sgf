"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Loader2,
  Edit,
  ArrowLeftRight,
  Plus,
  Minus,
  Package,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
}

interface InventoryMovement {
  id: number;
  type: string;
  quantity: number;
  location?: string;
  from?: string;
  to?: string;
  notes?: string;
  createdAt: string;
  createdBy?: {
    name: string;
  };
}

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
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, movementsRes] = await Promise.all([
          fetch(`/api/products/${productId}`),
          fetch(`/api/inventory/movements?productId=${productId}`),
        ]);

        if (!productRes.ok) throw new Error("Error al cargar producto");

        const productData = await productRes.json();
        setProduct(productData);

        if (movementsRes.ok) {
          const movementsData = await movementsRes.json();
          setMovements(movementsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  const isMembership =
    product.name.includes("EFECTIVO") ||
    product.name === "VISITA" ||
    product.name.includes("MENSUALIDAD") ||
    product.name.includes("SEMANA");

  const totalStock = product.warehouseStock + product.gymStock;
  const isLowStock = !isMembership && totalStock < product.minStock;

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "ENTRY":
        return <Package className="h-4 w-4 text-green-600" />;
      case "TRANSFER":
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      case "ADJUSTMENT":
        return <Plus className="h-4 w-4 text-orange-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementLabel = (movement: InventoryMovement) => {
    switch (movement.type) {
      case "ENTRY":
        return `Entrada en ${movement.location === "WAREHOUSE" ? "Bodega" : "Gym"}`;
      case "TRANSFER":
        return `Traspaso: ${movement.from === "WAREHOUSE" ? "Bodega" : "Gym"} → ${
          movement.to === "WAREHOUSE" ? "Bodega" : "Gym"
        }`;
      case "ADJUSTMENT":
        return "Ajuste de inventario";
      default:
        return "Movimiento";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-white rounded-t-xl shrink-0">
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
          {/* Product Info */}
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
                    className="mt-1 bg-blue-50 text-blue-700 border-blue-200"
                  >
                    Membresía
                  </Badge>
                )}
              </div>
              <p className="text-xl sm:text-2xl font-bold">
                ${Number(product.salePrice).toFixed(2)}
              </p>
            </div>

            {!isMembership && (
              <>
                {isLowStock && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 font-medium">
                      ⚠️ Stock bajo mínimo ({product.minStock} unidades)
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Card>
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-2xl font-bold">
                        {product.gymStock}
                      </div>
                      <p className="text-xs text-gray-500">Stock Gym</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-2xl font-bold">
                        {product.warehouseStock}
                      </div>
                      <p className="text-xs text-gray-500">Stock Bodega</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-2xl font-bold">{totalStock}</div>
                      <p className="text-xs text-gray-500">Total</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
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

          {/* Movement History */}
          {!isMembership && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm sm:text-base">
                Historial de Movimientos
              </h4>

              {movements.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay movimientos registrados
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {movements.map((movement) => (
                    <div
                      key={movement.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getMovementIcon(movement.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <p className="font-medium text-sm">
                              {getMovementLabel(movement)}
                            </p>
                            <p className="text-xs text-gray-500 shrink-0">
                              {new Date(movement.createdAt).toLocaleDateString(
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
                          <p className="text-sm text-gray-600 mt-1">
                            Cantidad:{" "}
                            <span className="font-medium">
                              {movement.quantity > 0 ? "+" : ""}
                              {movement.quantity}
                            </span>
                          </p>
                          {movement.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              {movement.notes}
                            </p>
                          )}
                          {movement.createdBy && (
                            <p className="text-xs text-gray-400 mt-1">
                              Por: {movement.createdBy.name}
                            </p>
                          )}
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
