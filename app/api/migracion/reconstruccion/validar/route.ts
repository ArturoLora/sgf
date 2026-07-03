import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateReconstruction } from "@/modules/migration/reconstruction.service";
import { z } from "zod";

const RequestSchema = z.object({
  expectedMembers: z.number().int().nonnegative(),
  expectedShifts: z.number().int().nonnegative(),
  consistencyWarningCount: z.number().int().nonnegative(),
});

export async function POST(request: Request): Promise<Response> {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const result = await validateReconstruction(
    parsed.data.expectedMembers,
    parsed.data.expectedShifts,
    parsed.data.consistencyWarningCount,
  );
  return Response.json(result);
}
