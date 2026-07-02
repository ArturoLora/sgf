import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReconstructionPreview } from "@/modules/migration/reconstruction.service";

export async function GET(): Promise<Response> {
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

  const preview = await getReconstructionPreview();
  return Response.json(preview);
}
