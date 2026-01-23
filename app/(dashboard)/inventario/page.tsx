import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProductosService } from "@/services";
import InventarioManager from "./inventario-manager";

export default async function InventarioPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const productos = await ProductosService.getAllProductos();

  return <InventarioManager initialProductos={productos} />;
}
