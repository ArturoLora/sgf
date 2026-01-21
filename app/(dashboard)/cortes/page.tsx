// app/(dashboard)/cortes/page.tsx
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CortesService } from "@/services";
import { prisma } from "@/lib/db";
import CortesManager from "./cortes-manager";

async function getCortes() {
  const corteActivo = await CortesService.getCorteActivo();
  const cortes = await CortesService.getAllCortes();
  return { corteActivo, cortes };
}

async function getCajeros() {
  const users = await prisma.user.findMany({
    where: { activo: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

export default async function CortesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { corteActivo, cortes } = await getCortes();
  const cajeros = await getCajeros();

  return (
    <CortesManager
      userId={session.user.id}
      initialCorteActivo={corteActivo}
      initialCortes={cortes}
      cajeros={cajeros}
    />
  );
}
