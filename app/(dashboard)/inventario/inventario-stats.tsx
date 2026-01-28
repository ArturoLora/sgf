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

export default function InventarioStats({
  totalProductos,
  stockBajo,
  sinStock,
  valorTotal,
  stockTotalGym,
  stockTotalBodega,
}: InventarioStatsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">
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
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Stock Bajo
              </p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">
                {stockBajo}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Stock Total
              </p>
              <p className="text-xl sm:text-2xl font-bold">
                {stockTotalGym + stockTotalBodega}
              </p>
              <p className="text-xs text-gray-500 truncate">
                G:{stockTotalGym} B:{stockTotalBodega}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">
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
