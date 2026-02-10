import { requireAuth } from "@/lib/require-role";
import { ProductsService } from "@/services";
import ProductosManager from "./_components/productos-manager";
import ProductosStats from "./_components/productos-stats";

export default async function ProductosPage() {
  await requireAuth();

  const products = await ProductsService.getAllProducts();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Productos</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gestión de inventario y control de stock
        </p>
      </div>

      <ProductosStats products={products} />
      <ProductosManager initialProducts={products} />
    </div>
  );
}
