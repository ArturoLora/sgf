import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CortesService } from "@/services";
import CortesManager from "./cortes-manager";

async function getCortes() {
  const corteActivo = await CortesService.getCorteActivo();
  const cortes = await CortesService.getAllCortes();
  return { corteActivo, cortes };
}

export default async function CortesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { corteActivo, cortes } = await getCortes();

  return (
    <CortesManager
      userId={session.user.id}
      initialCorteActivo={corteActivo}
      initialCortes={cortes}
    />
  );
}
