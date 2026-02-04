import { requireAuth } from "@/lib/require-role";
import { ProductsService } from "@/services";
import { InventarioManager } from "./_components/inventario-manager";

export default async function InventarioPage() {
  await requireAuth();

  const allProducts = await ProductsService.getAllProducts();

  // Excluir membresías del inventario físico
  const keywords = [
    "EFECTIVO",
    "VISITA",
    "MENSUALIDAD",
    "SEMANA",
    "TRIMESTRE",
    "ANUAL",
    "PROMOCION",
    "RENACER",
  ];

  const physicalProducts = allProducts.filter((p) => {
    return !keywords.some((keyword) => p.name.toUpperCase().includes(keyword));
  });

  return <InventarioManager productos={physicalProducts} />;
}
