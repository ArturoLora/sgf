// app/(dashboard)/historial-ventas/page.tsx
import { requireAdmin } from "@/lib/require-role";
import HistorialVentasManager from "./historial-ventas-manager";
import { prisma } from "@/lib/db";

async function getCashiers() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

async function getProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return products;
}

async function getMembers() {
  const members = await prisma.member.findMany({
    where: { isActive: true },
    select: { id: true, memberNumber: true, name: true },
    orderBy: { name: "asc" },
  });
  return members;
}

export default async function HistorialVentasPage() {
  await requireAdmin();

  const [cashiers, products, members] = await Promise.all([
    getCashiers(),
    getProducts(),
    getMembers(),
  ]);

  return (
    <HistorialVentasManager
      cashiers={cashiers}
      products={products}
      members={members}
    />
  );
}
