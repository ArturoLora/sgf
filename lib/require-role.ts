// lib/require-role.ts
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  let isActive = false;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isActive: true },
    });
    isActive = user?.isActive ?? false;
  } catch {
    redirect("/login");
  }

  if (!isActive) {
    redirect("/login");
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();

  // ✅ Consultar role desde la base de datos
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/");
  }

  return session;
}

// Story 3.4 (H3): equivalente de requireAdmin() para API routes — redirect()
// no es utilizable en un route handler (produce un digest NEXT_REDIRECT en
// vez de una respuesta JSON con status code). Mismo chequeo que requireAuth()
// + requireAdmin() combinados (sesión, isActive, role), pero devuelve un
// NextResponse listo para retornar en vez de redirigir. Acotado a
// app/api/usuarios/* — no se aplicó a otras rutas ADMIN-only del proyecto
// (ver Story 3.4, hallazgo fuera de alcance sobre Migración).
export async function requireActiveAdminApi(): Promise<
  | { errorResponse: NextResponse }
  | { session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>> }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return {
      errorResponse: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });

  if (user?.role !== "ADMIN" || !user.isActive) {
    return {
      errorResponse: NextResponse.json(
        { error: "Acceso restringido" },
        { status: 403 },
      ),
    };
  }

  return { session };
}
