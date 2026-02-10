// app/(dashboard)/productos/_components/productos-stats.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { ProductStatistics } from "@/lib/domain/products";
import { formatInventoryValue } from "@/lib/domain/products";

interface ProductosStatsProps {
  stats: ProductStatistics;
}

export default function ProductosStats({ stats }: ProductosStatsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Total de productos</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">{stats.active}</div>
          <p className="text-xs text-muted-foreground">Activos</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold text-destructive">
            {stats.lowStock}
          </div>
          <p className="text-xs text-muted-foreground">Stock bajo</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            {formatInventoryValue(stats.inventoryValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Valor total inventario
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
