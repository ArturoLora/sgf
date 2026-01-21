import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import HistorialVentasManager from "./historial-ventas-manager";
import { prisma } from "@/lib/db";

async function getCajeros() {
  const users = await prisma.user.findMany({
    where: { activo: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

async function getProductos() {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return productos;
}

async function getSocios() {
  const socios = await prisma.socio.findMany({
    where: { activo: true },
    select: { id: true, numeroSocio: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return socios;
}

export default async function HistorialVentasPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [cajeros, productos, socios] = await Promise.all([
    getCajeros(),
    getProductos(),
    getSocios(),
  ]);

  return (
    <HistorialVentasManager
      cajeros={cajeros}
      productos={productos}
      socios={socios}
    />
  );
}
