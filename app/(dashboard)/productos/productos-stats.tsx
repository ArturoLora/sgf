import { Card, CardContent } from "@/components/ui/card";

interface Product {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
}

interface ProductosStatsProps {
  products: Product[];
}

export default function ProductosStats({ products }: ProductosStatsProps) {
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.isActive).length;

  const lowStockProducts = products.filter(
    (p) =>
      p.isActive && (p.gymStock < p.minStock || p.warehouseStock < p.minStock),
  ).length;

  const inventoryValue = products
    .filter((p) => p.isActive)
    .reduce((sum, p) => {
      const totalStock = p.warehouseStock + p.gymStock;
      return sum + Number(p.salePrice) * totalStock;
    }, 0);

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-gray-500">Total de productos</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">{activeProducts}</div>
          <p className="text-xs text-gray-500">Activos</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold text-red-600">
            {lowStockProducts}
          </div>
          <p className="text-xs text-gray-500">Stock bajo</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            ${inventoryValue.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500">Valor total inventario</p>
        </CardContent>
      </Card>
    </div>
  );
}
