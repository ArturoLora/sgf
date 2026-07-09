import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  // Historia ciclo-de-vida-empleados: sin filtro isActive — un User inactivo
  // es una identidad histórica válida para el mapeo (ver investigación
  // employee-mapping-historical-authorship). No cambia la autenticación de
  // esta ruta.
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true },
    orderBy: { name: "asc" },
  });

  return Response.json(users);
}
