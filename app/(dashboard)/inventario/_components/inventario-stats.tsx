"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertCircle, TrendingUp, DollarSign } from "lucide-react";

interface InventarioStatsProps {
  totalProductos: number;
  stockBajo: number;
  sinStock: number;
  valorTotal: number;
  stockTotalGym: number;
  stockTotalBodega: number;
}

export function InventarioStats({
  totalProductos,
  stockBajo,
  valorTotal,
  stockTotalGym,
  stockTotalBodega,
}: InventarioStatsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Total Productos
              </p>
              <p className="text-xl sm:text-2xl font-bold">{totalProductos}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Stock Bajo
              </p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stockBajo}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Stock Total
              </p>
              <p className="text-xl sm:text-2xl font-bold">
                {stockTotalGym + stockTotalBodega}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                G:{stockTotalGym} B:{stockTotalBodega}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Valor Total
              </p>
              <p className="text-xl sm:text-2xl font-bold truncate">
                ${valorTotal.toFixed(0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
