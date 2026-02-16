import { Card, CardContent } from "@/components/ui/card";
import type { ProductoResponse } from "@/types/api/products";
import { computeStats } from "@/lib/domain/products";

interface ProductosStatsProps {
  products: ProductoResponse[];
}

export default function ProductosStats({ products }: ProductosStatsProps) {
  const stats = computeStats(products);

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            {stats.totalProducts}
          </div>
          <p className="text-xs text-muted-foreground">Total de productos</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            {stats.activeProducts}
          </div>
          <p className="text-xs text-muted-foreground">Activos</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold text-destructive">
            {stats.lowStockProducts}
          </div>
          <p className="text-xs text-muted-foreground">Stock bajo</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            ${stats.inventoryValue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Valor total inventario
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
