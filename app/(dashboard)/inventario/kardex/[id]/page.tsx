import { requireAuth } from "@/lib/require-role";
import { ProductsService } from "@/services";
import { obtenerKardex } from "@/lib/api/inventory.client";
import { KardexLista } from "../_components/kardex-lista";
import { notFound } from "next/navigation";

interface KardexPageProps {
  params: Promise<{ id: string }>;
}

export default async function KardexPage({ params }: KardexPageProps) {
  await requireAuth();

  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    notFound();
  }

  const [product, movimientos] = await Promise.all([
    ProductsService.getProductById(productId),
    obtenerKardex(productId),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Kardex</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {product.name}
        </p>
      </div>

      <KardexLista movimientos={movimientos} producto={product} />
    </div>
  );
}
