"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, ArrowLeftRight, Package } from "lucide-react";
import type { ProductoResponse } from "@/types/api/products";
import { isMembership, getStockStatus } from "@/lib/domain/products";

interface ProductosTablaProps {
  products: ProductoResponse[];
  onDetail: (id: number) => void;
  onEdit: (id: number) => void;
  onTransfer: (id: number) => void;
  onEntry: (id: number) => void;
}

export default function ProductosTabla({
  products,
  onDetail,
  onEdit,
  onTransfer,
  onEntry,
}: ProductosTablaProps) {
  return (
    <div className="space-y-3">
      {products.map((product) => {
        const gymStatus = getStockStatus(product.gymStock, product.minStock);
        const warehouseStatus = getStockStatus(
          product.warehouseStock,
          product.minStock,
        );
        const isMembershipProduct = isMembership(product);

        return (
          <div
            key={product.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border p-3 sm:p-4 hover:bg-muted transition-colors"
          >
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {product.name}
                </p>
                {!product.isActive && (
                  <Badge variant="destructive" className="shrink-0">
                    Inactivo
                  </Badge>
                )}
                {isMembershipProduct && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shrink-0"
                  >
                    Membresía
                  </Badge>
                )}
                {(gymStatus.text === "Bajo" ||
                  warehouseStatus.text === "Bajo") &&
                  !isMembershipProduct && (
                    <Badge variant="destructive" className="shrink-0">
                      Stock Bajo
                    </Badge>
                  )}
              </div>

              <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-base sm:text-lg text-foreground">
                  ${Number(product.salePrice).toFixed(2)}
                </p>
                {!isMembershipProduct && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Gym:</span>
                      <span
                        className={
                          gymStatus.text === "Bajo" ||
                          gymStatus.text === "Sin stock"
                            ? "text-destructive font-semibold"
                            : ""
                        }
                      >
                        {product.gymStock}
                      </span>
                      <Badge
                        variant={gymStatus.color}
                        className={gymStatus.className}
                      >
                        {gymStatus.text}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Bodega:</span>
                      <span
                        className={
                          warehouseStatus.text === "Bajo" ||
                          warehouseStatus.text === "Sin stock"
                            ? "text-destructive font-semibold"
                            : ""
                        }
                      >
                        {product.warehouseStock}
                      </span>
                      <Badge
                        variant={warehouseStatus.color}
                        className={warehouseStatus.className}
                      >
                        {warehouseStatus.text}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Min: {product.minStock}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {!isMembershipProduct && (
                <>
                  <Button
                    onClick={() => onTransfer(product.id)}
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-1 sm:flex-initial"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    <span className="hidden sm:inline">Traspaso</span>
                  </Button>
                  <Button
                    onClick={() => onEntry(product.id)}
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-1 sm:flex-initial"
                  >
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">Entrada</span>
                  </Button>
                </>
              )}
              <Button
                onClick={() => onDetail(product.id)}
                variant="outline"
                size="sm"
                className="gap-2 flex-1 sm:flex-initial"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Ver</span>
              </Button>
              <Button
                onClick={() => onEdit(product.id)}
                variant="outline"
                size="sm"
                className="gap-2 flex-1 sm:flex-initial"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
