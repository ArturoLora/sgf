import { requireAuth } from "@/lib/require-role";
import { ProductsService } from "@/services";
import { InventarioManager } from "./_components/inventario-manager";
import { filtrarProductosFisicos } from "@/lib/domain/inventory";

export default async function InventarioPage() {
  await requireAuth();

  const allProducts = await ProductsService.getAllProducts();
  const physicalProducts = filtrarProductosFisicos(allProducts);

  return <InventarioManager productos={physicalProducts} />;
}
