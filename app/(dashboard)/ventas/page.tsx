import { requireAuth } from "@/lib/require-role";
import { getAllProducts } from "@/services/products.service";
import VentasContainer from "./_components/ventas-container";

export default async function VentasPage() {
  await requireAuth();

  const products = await getAllProducts({ isActive: true });

  const productosUI = products.map((p) => ({
    id: p.id,
    nombre: p.name,
    precioVenta: p.salePrice,
    existenciaGym: p.gymStock,
    activo: p.isActive,
  }));

  return <VentasContainer initialProductos={productosUI} />;
}
