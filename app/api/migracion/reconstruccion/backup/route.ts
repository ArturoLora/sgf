import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runDatabaseBackup } from "@/modules/migration/reconstruction.service";

export async function POST(): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return Response.json({ error: "Acceso restringido" }, { status: 403 });
  }

  try {
    const result = await runDatabaseBackup();
    return Response.json(result);
  } catch (e) {
    // AC6: a failed execution must never be reported as success.
    return Response.json(
      { error: e instanceof Error ? e.message : "No se pudo generar el respaldo" },
      { status: 500 },
    );
  }
}
