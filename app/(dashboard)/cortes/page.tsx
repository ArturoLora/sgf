import { requireAuth } from "@/lib/require-role";
import { prisma } from "@/lib/db";
import CortesManager from "./cortes-manager";

// Server Component - Maneja auth y data fetching inicial
async function getCajeros() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

export default async function CortesPage() {
  // Verificar autenticación
  const session = await requireAuth();

  // Cargar lista de cajeros para filtros
  const cajeros = await getCajeros();

  return (
    <CortesManager
      cajeros={cajeros}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
