import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProductosService } from "@/services";
import ProductosManager from "./productos-manager";

export default async function ProductosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const productos = await ProductosService.getAllProductos();

  return <ProductosManager initialProductos={productos} />;
}
