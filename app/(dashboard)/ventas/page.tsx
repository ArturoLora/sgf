// app/(dashboard)/ventas/page.tsx
import { requireAuth } from "@/lib/require-role";
import { getAllProducts } from "@/services/products.service";
import VentasContainer from "./ventas-container";

export default async function VentasPage() {
  await requireAuth();

  const products = await getAllProducts({ isActive: true });

  // Mapear propiedades a español para el frontend
  const productosUI = products.map((p) => ({
    id: p.id,
    nombre: p.name,
    precioVenta: p.salePrice,
    existenciaGym: p.gymStock,
    activo: p.isActive,
  }));

  return <VentasContainer initialProductos={productosUI} />;
}
